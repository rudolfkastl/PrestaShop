<?php
/**
 * Copyright since 2007 PrestaShop SA and Contributors
 * PrestaShop is an International Registered Trademark & Property of PrestaShop SA
 *
 * NOTICE OF LICENSE
 *
 * This source file is subject to the Open Software License (OSL 3.0)
 * that is bundled with this package in the file LICENSE.md.
 * It is also available through the world-wide-web at this URL:
 * https://opensource.org/licenses/OSL-3.0
 * If you did not receive a copy of the license and are unable to
 * obtain it through the world-wide-web, please send an email
 * to license@prestashop.com so we can send you a copy immediately.
 *
 * DISCLAIMER
 *
 * Do not edit or add to this file if you wish to upgrade PrestaShop to newer
 * versions in the future. If you wish to customize PrestaShop for your
 * needs please refer to https://devdocs.prestashop.com/ for more information.
 *
 * @author    PrestaShop SA and Contributors <contact@prestashop.com>
 * @copyright Since 2007 PrestaShop SA and Contributors
 * @license   https://opensource.org/licenses/OSL-3.0 Open Software License (OSL 3.0)
 */

declare(strict_types=1);

namespace PrestaShopBundle\ApiPlatform\Normalizer;

use Symfony\Component\PropertyAccess\PropertyAccessorInterface;
use Symfony\Component\PropertyInfo\PropertyTypeExtractorInterface;
use Symfony\Component\Serializer\Mapping\ClassDiscriminatorResolverInterface;
use Symfony\Component\Serializer\Mapping\Factory\ClassMetadataFactoryInterface;
use Symfony\Component\Serializer\NameConverter\NameConverterInterface;
use Symfony\Component\Serializer\Normalizer\ObjectNormalizer as SfObjectNormalizer;

/**
 * Used to be automatic injected in PrestaShopBundle/ApiPlatform/DomainSerializer::normalizers with
 * prestashop.api.denormalizers tagged services.
 */
class ObjectDenormalizer extends SfObjectNormalizer
{
    protected $protectedObjectClassResolver;

    public function __construct(
        ClassMetadataFactoryInterface $classMetadataFactory = null,
        NameConverterInterface $nameConverter = null,
        PropertyAccessorInterface $propertyAccessor = null,
        PropertyTypeExtractorInterface $propertyTypeExtractor = null,
        ClassDiscriminatorResolverInterface $classDiscriminatorResolver = null,
        callable $objectClassResolver = null,
        array $defaultContext = []
    ) {
        parent::__construct($classMetadataFactory, $nameConverter, $propertyAccessor, $propertyTypeExtractor, $classDiscriminatorResolver, $objectClassResolver, $defaultContext);

        $this->protectedObjectClassResolver = $objectClassResolver ?? function ($class) {
            return \is_object($class) ? \get_class($class) : $class;
        };
    }

    protected function extractAttributes(object $object, string $format = null, array $context = [])
    {
        $attributes = parent::extractAttributes($object, $format, $context);

        // Check methods that may have been ignored by the parent
        $class = ($this->protectedObjectClassResolver)($object);
        $reflClass = new \ReflectionClass($class);

        foreach ($reflClass->getMethods(\ReflectionMethod::IS_PUBLIC) as $reflMethod) {
            if (
                0 !== $reflMethod->getNumberOfRequiredParameters() ||
                $reflMethod->isStatic() ||
                $reflMethod->isConstructor() ||
                $reflMethod->isDestructor()
            ) {
                continue;
            }

            $methodName = $reflMethod->name;
            if (str_starts_with($methodName, 'get') || str_starts_with($methodName, 'has') || str_starts_with($methodName, 'is')) {
                continue;
            }
            // Add attributes that match the getter method
            if ($reflClass->hasProperty($methodName) && $this->isAllowedAttribute($object, $methodName, $format, $context)) {
                $attributes[] = $methodName;
            }
        }

        return $attributes;
    }

    /**
     * ObjectDenormalizer must be the last denormalizer as a fallback.
     *
     * @return int
     */
    public static function getDefaultPriority(): int
    {
        return -1;
    }
}
